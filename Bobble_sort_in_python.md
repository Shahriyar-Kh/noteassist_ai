# Bobble sort in python

Tool: generate
Generated: 2026-02-17 11:11 UTC
<h2 class="text-2xl font-bold mt-5 mb-2 text-blue-800">Definition</h2>
<p class="mb-3 leading-relaxed text-gray-800">Bobble sort is a simple way to sort lists of items in order. It works by repeatedly going through the list and swapping items that are in the wrong order. This process is repeated until the list is sorted.</p>
<h2 class="text-2xl font-bold mt-5 mb-2 text-blue-800">Explanation</h2>
<p class="mb-3 leading-relaxed text-gray-800">Imagine you have a bunch of toys in a box, and you want to put them in order from smallest to largest. Bobble sort is like looking through the box, finding a toy that is too big or too small, and swapping it with the one next to it. You keep doing this until all the toys are in the right order. In programming, we use a similar process to sort lists of numbers or words. We look at each item in the list, compare it to the one next to it, and swap them if they are in the wrong order.</p>
<h2 class="text-2xl font-bold mt-5 mb-2 text-blue-800">💻 Syntax &amp; Usage</h2>
<div class="codehilite"><pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4"><span></span><code><span class="c1"># Import no modules needed for bobble sort</span>
<span class="k">def</span><span class="w"> </span><span class="nf">bobble_sort</span><span class="p">(</span><span class="n">my_list</span><span class="p">):</span>  <span class="c1"># Define a function called bobble_sort</span>
    <span class="c1"># Get the length of the list</span>
    <span class="n">length</span> <span class="o">=</span> <span class="nb">len</span><span class="p">(</span><span class="n">my_list</span><span class="p">)</span>  
    <span class="c1"># Repeat the process until the list is sorted</span>
    <span class="k">for</span> <span class="n">i</span> <span class="ow">in</span> <span class="nb">range</span><span class="p">(</span><span class="n">length</span><span class="p">):</span>  
        <span class="c1"># Look at each item in the list</span>
        <span class="k">for</span> <span class="n">j</span> <span class="ow">in</span> <span class="nb">range</span><span class="p">(</span><span class="n">length</span> <span class="o">-</span> <span class="mi">1</span><span class="p">):</span>  
            <span class="c1"># If the current item is bigger than the next one, swap them</span>
            <span class="k">if</span> <span class="n">my_list</span><span class="p">[</span><span class="n">j</span><span class="p">]</span> <span class="o">&gt;</span> <span class="n">my_list</span><span class="p">[</span><span class="n">j</span> <span class="o">+</span> <span class="mi">1</span><span class="p">]:</span>  
                <span class="c1"># Swap the two items</span>
                <span class="n">my_list</span><span class="p">[</span><span class="n">j</span><span class="p">],</span> <span class="n">my_list</span><span class="p">[</span><span class="n">j</span> <span class="o">+</span> <span class="mi">1</span><span class="p">]</span> <span class="o">=</span> <span class="n">my_list</span><span class="p">[</span><span class="n">j</span> <span class="o">+</span> <span class="mi">1</span><span class="p">],</span> <span class="n">my_list</span><span class="p">[</span><span class="n">j</span><span class="p">]</span>  
    <span class="c1"># Return the sorted list</span>
    <span class="k">return</span> <span class="n">my_list</span>  

<span class="c1"># Call the function with a list</span>
<span class="n">my_list</span> <span class="o">=</span> <span class="p">[</span><span class="mi">5</span><span class="p">,</span> <span class="mi">2</span><span class="p">,</span> <span class="mi">8</span><span class="p">,</span> <span class="mi">1</span><span class="p">,</span> <span class="mi">9</span><span class="p">]</span>
<span class="n">sorted_list</span> <span class="o">=</span> <span class="n">bobble_sort</span><span class="p">(</span><span class="n">my_list</span><span class="p">)</span>
<span class="c1"># Print the sorted list</span>
<span class="nb">print</span><span class="p">(</span><span class="n">sorted_list</span><span class="p">)</span>
</code></pre></div>

<h2 class="text-2xl font-bold mt-5 mb-2 text-blue-800">Key Points</h2>
<ul class="list-disc pl-6 mb-3 space-y-1">
<li><strong>Bobble sort is simple</strong>: It's easy to understand and use, but it's not the fastest way to sort lists.</li>
<li><strong>It works by swapping items</strong>: Bobble sort looks at each item in the list and swaps it with the one next to it if they are in the wrong order.</li>
<li><strong>It repeats the process</strong>: Bobble sort keeps looking at the list and swapping items until the list is sorted.</li>
</ul>
<h2 class="text-2xl font-bold mt-5 mb-2 text-blue-800">Simple Examples</h2>
<p class="mb-3 leading-relaxed text-gray-800">Example 1: Sorting a list of numbers</p>
<div class="codehilite"><pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4"><span></span><code><span class="c1"># Define a list of numbers</span>
<span class="n">numbers</span> <span class="o">=</span> <span class="p">[</span><span class="mi">4</span><span class="p">,</span> <span class="mi">2</span><span class="p">,</span> <span class="mi">7</span><span class="p">,</span> <span class="mi">1</span><span class="p">,</span> <span class="mi">3</span><span class="p">]</span>
<span class="c1"># Call the bobble_sort function</span>
<span class="n">sorted_numbers</span> <span class="o">=</span> <span class="n">bobble_sort</span><span class="p">(</span><span class="n">numbers</span><span class="p">)</span>
<span class="c1"># Print the sorted list</span>
<span class="nb">print</span><span class="p">(</span><span class="n">sorted_numbers</span><span class="p">)</span>  <span class="c1"># Output: [1, 2, 3, 4, 7]</span>
</code></pre></div>

<p class="mb-3 leading-relaxed text-gray-800">Example 2: Sorting a list of words</p>
<div class="codehilite"><pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4"><span></span><code><span class="c1"># Define a list of words</span>
<span class="n">words</span> <span class="o">=</span> <span class="p">[</span><span class="s1">&#39;cat&#39;</span><span class="p">,</span> <span class="s1">&#39;apple&#39;</span><span class="p">,</span> <span class="s1">&#39;banana&#39;</span><span class="p">,</span> <span class="s1">&#39;dog&#39;</span><span class="p">]</span>
<span class="c1"># Call the bobble_sort function</span>
<span class="n">sorted_words</span> <span class="o">=</span> <span class="n">bobble_sort</span><span class="p">(</span><span class="n">words</span><span class="p">)</span>
<span class="c1"># Print the sorted list</span>
<span class="nb">print</span><span class="p">(</span><span class="n">sorted_words</span><span class="p">)</span>  <span class="c1"># Output: [&#39;apple&#39;, &#39;banana&#39;, &#39;cat&#39;, &#39;dog&#39;]</span>
</code></pre></div>

<h2 class="text-2xl font-bold mt-5 mb-2 text-blue-800">Practice Set</h2>
<p>Exercise 1: Sort the list <code class="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded font-mono text-sm">[6, 3, 8, 2, 9]</code> using bobble sort.<br />
Exercise 2: Sort the list <code class="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded font-mono text-sm">['dog', 'cat', 'apple', 'banana']</code> using bobble sort.<br />
Exercise 3: Create your own list of 5 items and sort it using bobble sort.</p>